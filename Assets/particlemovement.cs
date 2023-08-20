using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class particlemovement : MonoBehaviour
{
    Rigidbody2D rb;
    GameManager gm;
    [SerializeField] float spawnSpeed = 10.0f;
    [SerializeField] float speedMultiplier = 0.05f;
    // Start is called before the first frame update
    void Start()
    {
        rb=GetComponent<Rigidbody2D>();
        gm=FindObjectOfType<GameManager>();
    }

    // Update is called once per frame
    void Update()
    {
        rb.velocity = Vector2.left * ((spawnSpeed * (gm.flipSpawnPoint ? -1 : 1)) + speedMultiplier);

    }
}
