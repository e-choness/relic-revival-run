using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class spawnObjectScript : MonoBehaviour
{
    [SerializeField] float spawnSpeed = 10.0f;
    [SerializeField] float speedMultiplier = 0.05f;
    private Rigidbody2D _rigidbody2D;
    // Start is called before the first frame update
    void Start()
    {
        _rigidbody2D = GetComponent<Rigidbody2D>();
    }

    // Update is called once per frame
    void Update()
    {
        MoveObjectsToLeft();
    }

    private void MoveObjectsToLeft()
    {
        _rigidbody2D.velocity = Vector2.left * (spawnSpeed + speedMultiplier);
        
    }
    
    private void OnTriggerEnter2D(Collider2D other)
    {
        if(other.gameObject.CompareTag("Player"))
        {
            this.gameObject.SetActive(false);
        }
    }
}
