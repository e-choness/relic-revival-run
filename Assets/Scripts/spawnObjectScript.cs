using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class spawnObjectScript : MonoBehaviour
{
    [SerializeField] float spawnSpeed = 10.0f;
    [SerializeField] float speedMultiplier = 0.05f;
    private Rigidbody2D _rigidbody2D;

    private float _timer = 0.0f;
    // Start is called before the first frame update
    void Start()
    {
        _rigidbody2D = GetComponent<Rigidbody2D>();
    }

    // Update is called once per frame
    void Update()
    {
        MoveObjectsToLeft();
        DestroySpawns();
    }

    private void MoveObjectsToLeft()
    {
        _rigidbody2D.velocity = Vector2.left * (spawnSpeed + speedMultiplier);
        
    }

    // A save guard if player miss the spawned object, it will be destroyed after 5 seconds
    private void DestroySpawns()
    {
        _timer += Time.deltaTime;
    
        if (_timer > 5)
            Destroy(gameObject);
    }
    
    private void OnTriggerEnter2D(Collider2D other)
    {
        if(other.gameObject.CompareTag("Player"))
        {
            Destroy(gameObject);
        }
    }
}
